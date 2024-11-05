/**
 * Modules
 */

declare module 'vue-agile';

/**
 * File types
 */

declare module '*.json';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';

declare module 'v3-infinite-loading' {
	import { Plugin, DefineComponent } from 'vue';

	interface InfiniteLoadingProps {
		target: string;
	}

	export interface Events {
		infinite: (state: { loaded: () => void; complete: () => void }) => void;
	}

	const InfiniteLoading: DefineComponent<InfiniteLoadingProps, {}, {}, {}, {}, {}, {}, Events> &
		Plugin;

	export default InfiniteLoading;
}
