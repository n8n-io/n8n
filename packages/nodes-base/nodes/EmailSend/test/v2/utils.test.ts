import { createTransport } from 'nodemailer';

import { configureTransport } from '../../v2/utils';

jest.mock('nodemailer', () => ({
	createTransport: jest.fn(),
}));

describe('EmailSend transport configuration', () => {
	it('should apply content access restrictions to the transport', () => {
		configureTransport(
			{
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			},
			{},
		);

		expect(createTransport).toHaveBeenCalledWith(
			expect.objectContaining({
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			}),
			{
				disableFileAccess: true,
				disableUrlAccess: true,
			},
		);
	});
});
