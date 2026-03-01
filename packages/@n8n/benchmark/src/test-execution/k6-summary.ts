/**
Example JSON:

{
	"options": {
		"summaryTrendStats": ["avg", "min", "med", "max", "p(90)", "p(95)"],
		"summaryTimeUnit": "",
		"noColor": false
	},
	"state": { "isStdOutTTY": false, "isStdErrTTY": false, "testRunDurationMs": 23.374 },
	"metrics": {
		"http_req_tls_handshaking": {
			"type": "trend",
			"contains": "time",
			"values": { "avg": 0, "min": 0, "med": 0, "max": 0, "p(90)": 0, "p(95)": 0 }
		},
		"checks": {
			"type": "rate",
			"contains": "default",
			"values": { "rate": 1, "passes": 1, "fails": 0 }
		},
		"http_req_sending": {
			"type": "trend",
			"contains": "time",
			"values": {
				"p(90)": 0.512,
				"p(95)": 0.512,
				"avg": 0.512,
				"min": 0.512,
				"med": 0.512,
				"max": 0.512
			}
		},
		"http_reqs": {
			"contains": "default",
			"values": { "count": 1, "rate": 42.78257893385813 },
			"type": "counter"
		},
		"http_req_blocked": {
			"contains": "time",
			"values": {
				"avg": 1.496,
				"min": 1.496,
				"med": 1.496,
				"max": 1.496,
				"p(90)": 1.496,
				"p(95)": 1.496
			},
			"type": "trend"
		},
		"data_received": {
			"type": "counter",
			"contains": "data",
			"values": { "count": 269, "rate": 11508.513733207838 }
		},
		"iterations": {
			"type": "counter",
			"contains": "default",
			"values": { "count": 1, "rate": 42.78257893385813 }
		},
		"http_req_waiting": {
			"type": "trend",
			"contains": "time",
			"values": {
				"p(95)": 18.443,
				"avg": 18.443,
				"min": 18.443,
				"med": 18.443,
				"max": 18.443,
				"p(90)": 18.443
			}
		},
		"http_req_receiving": {
			"type": "trend",
			"contains": "time",
			"values": {
				"avg": 0.186,
				"min": 0.186,
				"med": 0.186,
				"max": 0.186,
				"p(90)": 0.186,
				"p(95)": 0.186
			}
		},
		"http_req_duration{expected_response:true}": {
			"type": "trend",
			"contains": "time",
			"values": {
				"max": 19.141,
				"p(90)": 19.141,
				"p(95)": 19.141,
				"avg": 19.141,
				"min": 19.141,
				"med": 19.141
			}
		},
		"iteration_duration": {
			"type": "trend",
			"contains": "time",
			"values": {
				"avg": 22.577833,
				"min": 22.577833,
				"med": 22.577833,
				"max": 22.577833,
				"p(90)": 22.577833,
				"p(95)": 22.577833
			}
		},
		"http_req_connecting": {
			"type": "trend",
			"contains": "time",
			"values": {
				"avg": 0.673,
				"min": 0.673,
				"med": 0.673,
				"max": 0.673,
				"p(90)": 0.673,
				"p(95)": 0.673
			}
		},
		"http_req_failed": {
			"type": "rate",
			"contains": "default",
			"values": { "rate": 0, "passes": 0, "fails": 1 }
		},
		"http_req_duration": {
			"type": "trend",
			"contains": "time",
			"values": {
				"p(90)": 19.141,
				"p(95)": 19.141,
				"avg": 19.141,
				"min": 19.141,
				"med": 19.141,
				"max": 19.141
			}
		},
		"data_sent": {
			"type": "counter",
			"contains": "data",
			"values": { "count": 102, "rate": 4363.82305125353 }
		}
	},
	"root_group": {
		"name": "",
		"path": "",
		"id": "d41d8cd98f00b204e9800998ecf8427e",
		"groups": [],
		"checks": [
			{
				"name": "is status 200",
				"path": "::is status 200",
				"id": "548d37ca5f33793206f7832e7cea54fb",
				"passes": 1,
				"fails": 0
			}
		]
	}
}
 */

type TrendStat = 'avg' | 'min' | 'med' | 'max' | 'p(90)' | 'p(95)';
type MetricType = 'trend' | 'rate' | 'counter';
type MetricContains = 'time' | 'default' | 'data';

interface TrendValues {
	avg: number;
	min: number;
	med: number;
	max: number;
	'p(90)': number;
	'p(95)': number;
}

interface RateValues {
	rate: number;
	passes: number;
	fails: number;
}

interface CounterValues {
	count: number;
	rate: number;
}

interface K6TrendMetric {
	type: 'trend';
	contains: 'time';
	values: TrendValues;
}

interface RateMetric {
	type: 'rate';
	contains: 'default';
	values: RateValues;
}

interface K6CounterMetric {
	type: 'counter';
	contains: MetricContains;
	values: CounterValues;
}

interface Options {
	summaryTrendStats: TrendStat[];
	summaryTimeUnit: string;
	noColor: boolean;
}

interface State {
	isStdOutTTY: boolean;
	isStdErrTTY: boolean;
	testRunDurationMs: number;
}

interface Metrics {
	http_req_tls_handshaking: K6TrendMetric;
	checks: RateMetric;
	http_req_sending: K6TrendMetric;
	http_reqs: K6CounterMetric;
	http_req_blocked: K6TrendMetric;
	data_received: K6CounterMetric;
	iterations: K6CounterMetric;
	http_req_waiting: K6TrendMetric;
	http_req_receiving: K6TrendMetric;
	'http_req_duration{expected_response:true}': K6TrendMetric;
	iteration_duration: K6TrendMetric;
	http_req_connecting: K6TrendMetric;
	http_req_failed: RateMetric;
	http_req_duration: K6TrendMetric;
	data_sent: K6CounterMetric;
}

interface K6Check {
	name: string;
	path: string;
	id: string;
	passes: number;
	fails: number;
}

interface RootGroup {
	name: string;
	path: string;
	id: string;
	groups: unknown[];
	checks: K6Check[];
}

interface K6EndOfTestSummary {
	options: Options;
	state: State;
	metrics: Metrics;
	root_group: RootGroup;
}
