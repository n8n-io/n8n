export {};

declare module 'luxon' {}

declare global {
	const DateTime: typeof luxon.DateTime;
}
