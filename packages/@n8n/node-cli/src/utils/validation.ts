export const validateNodeName = (name: string): string | undefined => {
	if (!name) return;

	// 1. Matches '@org/n8n-nodes-anything'
	const regexScoped = /^@([a-z0-9]+(?:-[a-z0-9]+)*)\/n8n-nodes-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
	// 2. Matches 'n8n-nodes-anything'
	const regexUnscoped = /^n8n-nodes-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

	if (!regexScoped.test(name) && !regexUnscoped.test(name)) {
		return 'Node name should be in the format @org/n8n-nodes-example or n8n-nodes-example';
	}
	return;
};
