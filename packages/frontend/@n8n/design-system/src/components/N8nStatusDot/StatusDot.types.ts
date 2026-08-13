export type StatusDotVariant = 'success' | 'warning' | 'danger';

export interface StatusDotProps {
	variant?: StatusDotVariant;
	pulse?: boolean;
}
