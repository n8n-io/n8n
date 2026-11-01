export type StatusDotVariant = 'success' | 'warning' | 'danger' | 'primary';

export interface StatusDotProps {
	variant?: StatusDotVariant;
	pulse?: boolean;
}
