import type { ChatArtifact, ChatMessageContentChunk } from '@n8n/api-types';

export function collectChatArtifacts(items: ChatMessageContentChunk[]): ChatArtifact[] {
	const artifacts: ChatArtifact[] = [];

	for (const item of items) {
		if (item.type === 'artifact-create') {
			if (!item.command.title) {
				continue;
			}

			artifacts.push({
				title: item.command.title,
				type: item.command.type,
				content: item.command.content,
			});
		} else if (item.type === 'artifact-edit') {
			// Find document by title
			const targetDoc = artifacts.find((doc) => doc.title === item.command.title);

			if (targetDoc) {
				if (item.command.replaceAll) {
					targetDoc.content = targetDoc.content
						.split(item.command.oldString)
						.join(item.command.newString);
				} else {
					targetDoc.content = targetDoc.content.replace(
						item.command.oldString,
						item.command.newString,
					);
				}
			}
		}
	}

	return artifacts;
}
