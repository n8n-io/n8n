// Shared by post-start.mjs (installs at container start) and scripts/cloud-session.mjs
// (re-installs in the session prelude). Both must agree or a session boots with a
// partial skill set.
export const MARKETPLACE = 'n8n-io/n8n-agent-skills';
export const PLUGINS = ['quality@n8n-agent-skills', 'security@n8n-agent-skills'];
