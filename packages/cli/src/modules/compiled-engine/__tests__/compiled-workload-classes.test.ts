import {
	parseWorkloadClasses,
	workloadClassArgs,
	workloadClassOf,
} from '../compiled-workload-classes';

describe('workload classes of the compiled engine', () => {
	it('has no classes without the setting, so a load sends no class', () => {
		for (const setting of ['', undefined, () => 'mock']) {
			const classes = parseWorkloadClasses(setting);
			expect(classes.names).toEqual(['default']);
			expect(workloadClassOf(classes, 'wf1')).toBeUndefined();
			expect(workloadClassArgs(classes, { slots: 'default=1', hostSteps: '' })).toEqual([]);
		}
	});

	it('gives a workflow the class of its rule, and the default class without a rule', () => {
		const classes = parseWorkloadClasses(' critical = wfA, wfB ;background=wfC;;bad name=wfD');
		expect(classes.names).toEqual(['critical', 'background', 'default']);
		expect(workloadClassOf(classes, 'wfA')).toBe('critical');
		expect(workloadClassOf(classes, 'wfB')).toBe('critical');
		expect(workloadClassOf(classes, 'wfC')).toBe('background');
		expect(workloadClassOf(classes, 'wfD')).toBe('default');
		expect(workloadClassOf(classes, 'other')).toBe('default');
	});

	it('gives the manual-run copy of a workflow the class of the workflow', () => {
		const classes = parseWorkloadClasses('background=wfC');
		expect(workloadClassOf(classes, 'wfC~manual')).toBe('background');
	});

	it('keeps the first class of a workflow, and the place of `default` in the list', () => {
		const classes = parseWorkloadClasses('default;critical=wfA;background=wfA');
		expect(classes.names).toEqual(['default', 'critical', 'background']);
		expect(workloadClassOf(classes, 'wfA')).toBe('critical');
	});

	it('keeps at most eight classes, with `default` as one of them', () => {
		const classes = parseWorkloadClasses('a=1;b=2;c=3;d=4;e=5;f=6;g=7;h=8;i=9');
		expect(classes.names).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'default']);
		expect(workloadClassOf(classes, '8')).toBe('default');
		expect(workloadClassOf(classes, '9')).toBe('default');
	});

	it('passes the limits of the classes to wfrt', () => {
		const classes = parseWorkloadClasses('critical=wfA');
		expect(workloadClassArgs(classes, { slots: ' default=8 ', hostSteps: 'default=4' })).toEqual([
			'--classes',
			'critical,default',
			'--class-slots',
			'default=8',
			'--class-host-steps',
			'default=4',
		]);
	});
});
