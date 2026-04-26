import type { Monitor } from 'node-screenshots';

export async function getPrimaryMonitor(): Promise<Monitor> {
	const { Monitor: MonitorClass } = await import('node-screenshots');
	const monitors = MonitorClass.all();
	if (monitors.length === 0) throw new Error('No monitors available');
	return monitors.find((m) => m.isPrimary()) ?? monitors[0];
}
