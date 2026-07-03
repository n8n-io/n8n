export type RadioGroupItemProps = {
	value: string;
	label?: string;
	description?: string;
	disabled?: boolean;
};

export type RadioGroupItemSlots = {
	default(): unknown;
};
