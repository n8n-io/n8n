import { listCredentials } from '../../utils/credentials-db';

export default defineEventHandler(() => {
	return { credentials: listCredentials() };
});
