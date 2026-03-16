import { getActiveAgent } from '../../utils/agent-runtime';

export default defineEventHandler(() => {
	return { active: !!getActiveAgent() };
});
