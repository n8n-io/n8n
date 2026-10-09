import { generateNanoId } from '@n8n/utils/generate-nano-id';

export function generateAgentResourceId(existingIds: Iterable<string> = []): string {
	const existing = new Set(existingIds);

	for (let attempt = 0; attempt < 10; attempt++) {
		const id = generateNanoId();
		if (!existing.has(id)) return id;
	}

	throw new Error('Could not generate unique agent resource id');
}
