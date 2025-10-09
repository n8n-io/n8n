declare module 'cypress-otp' {
	// eslint-disable-next-line import-x/no-default-export
	export default function generateOTPToken(secret: string): string;
}
