import { z } from 'zod';

export const convertValueBySchema = (value: unknown, schema: any): unknown => {
	if (!schema || !value) return value;

	if (typeof value === 'string') {
		if (schema instanceof z.ZodNumber) {
			return Number(value);
		} else if (schema instanceof z.ZodBoolean) {
			return value.toLowerCase() === 'true';
		} else if (schema instanceof z.ZodObject) {
			try {
				const parsed = JSON.parse(value);
				return convertValueBySchema(parsed, schema);
			} catch {
				return value;
			}
		}
	}

	if (schema instanceof z.ZodObject && typeof value === 'object' && value !== null) {
		const result: any = {};
		for (const [key, val] of Object.entries(value)) {
			const fieldSchema = schema.shape[key];
			if (fieldSchema) {
				result[key] = convertValueBySchema(val, fieldSchema);
			} else {
				result[key] = val;
			}
		}
		return result;
	}

	return value;
};

export const convertObjectBySchema = (obj: any, schema: any): any => {
	return convertValueBySchema(obj, schema);
};
