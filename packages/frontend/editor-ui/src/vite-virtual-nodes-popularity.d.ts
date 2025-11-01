/// <reference types="vite/client" />

declare module 'virtual:node-popularity-data' {
	const data: Array<{
		id: string;
		popularity: number;
	}>;
	export default data;
}
