import { Monitor } from 'node-screenshots';

export function getPrimaryMonitor(): Monitor {
	const monitors = Monitor.all();
	if (monitors.length === 0) throw new Error('No monitors available');
	return monitors.find((m) => m.isPrimary()) ?? monitors[0];
}
