export function shouldStopRenamePromptSpacePropagation(event: Pick<KeyboardEvent, 'key' | 'code'>) {
	return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
}
