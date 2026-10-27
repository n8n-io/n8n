import { acceptInvitation } from '../invitation.api';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { v4 as uuidv4 } from 'uuid';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

describe('invitation.api', () => {
	const mockContext = {} as IRestApiContext;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('acceptInvitation', () => {
		it('should call /invitations/accept endpoint with token', async () => {
			const token = 'valid-jwt-token';
			const params = {
				token,
				firstName: 'John',
				lastName: 'Doe',
				password: 'Password123!',
			};

			vi.mocked(makeRestApiRequest).mockResolvedValue({ id: uuidv4() } as never);

			await acceptInvitation(mockContext, params);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				mockContext,
				'POST',
				'/invitations/accept',
				params,
			);
		});
	});
});
