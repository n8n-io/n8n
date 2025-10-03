export const validateNodeName = (name: string): string | undefined => {
	if (!name) return;

	// 1. Matches '@org/n8n-nodes-anything'
	const regexScoped = /^@([a-z0-9]+(?:-[a-z0-9]+)*)\/n8n-nodes-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
	// 2. Matches 'n8n-nodes-anything'
	const regexUnscoped = /^n8n-nodes-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

	if (!regexScoped.test(name) && !regexUnscoped.test(name)) {
		return "Must start with 'n8n-nodes-' or '@org/n8n-nodes-'. Examples: n8n-nodes-my-app, @mycompany/n8n-nodes-my-app";
	}
	return;
};
