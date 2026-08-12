import { describe, expect, it } from 'vitest';

import {
	INSTANCE_AI_DOCK_EDGE_INSET,
	INSTANCE_AI_DOCK_GAP,
	INSTANCE_AI_LAUNCHER_SIZE,
	getDockedPanelGeometry,
} from '../instanceAiDock';

describe('getDockedPanelGeometry', () => {
	const base = {
		panelWidth: 560,
		panelHeight: 820,
		minHeight: 300,
		launcherSize: INSTANCE_AI_LAUNCHER_SIZE,
		edgeInset: INSTANCE_AI_DOCK_EDGE_INSET,
		gap: INSTANCE_AI_DOCK_GAP,
		dockBottomOffset: INSTANCE_AI_DOCK_EDGE_INSET,
		viewport: { width: 1400, height: 1100 },
	};

	it('right-aligns with the launcher and sits one gap above it', () => {
		const geo = getDockedPanelGeometry(base);

		expect(geo.x + geo.width).toBe(base.viewport.width - INSTANCE_AI_DOCK_EDGE_INSET);
		expect(geo.y + geo.height).toBe(
			base.viewport.height -
				INSTANCE_AI_LAUNCHER_SIZE -
				base.dockBottomOffset -
				INSTANCE_AI_DOCK_GAP,
		);
		expect(geo.height).toBe(820);
	});

	it('caps height so a tall panel still docks above the launcher', () => {
		const geo = getDockedPanelGeometry({
			...base,
			viewport: { width: 1200, height: 700 },
		});

		const launcherStack = INSTANCE_AI_LAUNCHER_SIZE + base.dockBottomOffset + INSTANCE_AI_DOCK_GAP;
		expect(geo.height).toBe(700 - launcherStack - INSTANCE_AI_DOCK_EDGE_INSET);
		expect(geo.y + geo.height).toBe(700 - launcherStack);
		expect(geo.x + geo.width).toBe(1200 - INSTANCE_AI_DOCK_EDGE_INSET);
	});

	it('lifts with the logs panel via dockBottomOffset', () => {
		const withLogs = getDockedPanelGeometry({
			...base,
			dockBottomOffset: INSTANCE_AI_DOCK_EDGE_INSET + 200,
		});
		const withoutLogs = getDockedPanelGeometry(base);

		expect(withLogs.y + withLogs.height).toBe(withoutLogs.y + withoutLogs.height - 200);
		expect(withLogs.x + withLogs.width).toBe(withoutLogs.x + withoutLogs.width);
	});
});
