import Vue from 'vue';

/** N8n component common definition */
export declare class N8nComponent extends Vue {
	/** Install component into Vue */
	static install(vue: typeof Vue): void;
}

/** Component size definition for button, input, etc */
export type N8nComponentSize = 'xlarge' | 'large' | 'medium' | 'small' | 'mini';
