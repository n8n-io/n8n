import { TIME } from '@/app/constants/durations';

export function formatAgentElapsedTime(milliseconds: number): string {
	const seconds = Number.isFinite(milliseconds)
		? Math.max(0, Math.floor(milliseconds / TIME.SECOND))
		: 0;
	const minutes = Math.floor(seconds / 60);
	const remainder = String(seconds % 60).padStart(2, '0');
	return minutes < 60
		? `${minutes}:${remainder}`
		: `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainder}`;
}
