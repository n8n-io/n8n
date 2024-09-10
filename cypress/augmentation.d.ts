declare module 'cypress-otp' {
	// eslint-disable-next-line import/no-default-export
	export default function generateOTPToken(secret: string): string;
}
