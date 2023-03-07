export type IN8nButton = {
	attrs: {
		label: string;
		type?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger';
		size?: 'mini' | 'small' | 'medium' | 'large' | 'xlarge';
		loading?: boolean;
		disabled?: boolean;
		outline?: boolean;
		text?: boolean;
		icon?: string;
		block?: boolean;
		active?: boolean;
		float?: 'left' | 'right';
		square?: boolean;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'data-test-id'?: string;
	};
	listeners?: Record<string, (event: Event) => void>;
};
