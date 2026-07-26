// The build config compiles with resolveJsonModule disabled, so type the
// packed-data JSON (loaded natively by the CJS require at runtime) by hand.
declare module 'moment-timezone/data/packed/latest.json' {
	const data: {
		version: string;
		zones: string[];
		links: string[];
		countries: string[];
	};
	export default data;
}
