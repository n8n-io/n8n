export const testTransformer = {
	to(data: any) {
		if ('secretProperty' in data) {
			data.secretProperty = `secret-${data.secretProperty}`;
		}
		return data;
	},
	from(data: any) {
		if ('secretProperty' in data) {
			data.secretProperty = data.secretProperty.split('-')[1];
		}
		return data;
	},
};
