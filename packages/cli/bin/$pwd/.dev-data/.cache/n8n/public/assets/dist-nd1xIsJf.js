import { $d as init_runtime_core_esm_bundler, Gf as toRaw, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Pf as isProxy, Tf as watch, Vf as ref, Wf as shallowRef, Zd as h, a as LineController, i as Chart$1, lf as onMounted, of as onBeforeUnmount, t as BarController } from "./vendor-Hx42-oQF.js";
//#region ../../../node_modules/.pnpm/vue-chartjs@5.2.0_chart.js@4.4.0_vue@3.5.26_typescript@6.0.2_/node_modules/vue-chartjs/dist/index.js
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var CommonProps = {
	data: {
		type: Object,
		required: true
	},
	options: {
		type: Object,
		default: () => ({})
	},
	plugins: {
		type: Array,
		default: () => []
	},
	datasetIdKey: {
		type: String,
		default: "label"
	},
	updateMode: {
		type: String,
		default: void 0
	}
};
var Props = {
	type: {
		type: String,
		required: true
	},
	...CommonProps
};
var compatProps = "3.5.26"[0] === "2" ? (internals, props) => Object.assign(internals, { attrs: props }) : (internals, props) => Object.assign(internals, props);
function toRawIfProxy(obj) {
	return isProxy(obj) ? toRaw(obj) : obj;
}
function cloneProxy(obj) {
	let src = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : obj;
	return isProxy(src) ? new Proxy(obj, {}) : obj;
}
function setOptions(chart, nextOptions) {
	const options = chart.options;
	if (options && nextOptions) Object.assign(options, nextOptions);
}
function setLabels(currentData, nextLabels) {
	currentData.labels = nextLabels;
}
function setDatasets(currentData, nextDatasets, datasetIdKey) {
	const addedDatasets = [];
	currentData.datasets = nextDatasets.map((nextDataset) => {
		const currentDataset = currentData.datasets.find((dataset) => dataset[datasetIdKey] === nextDataset[datasetIdKey]);
		if (!currentDataset || !nextDataset.data || addedDatasets.includes(currentDataset)) return { ...nextDataset };
		addedDatasets.push(currentDataset);
		Object.assign(currentDataset, nextDataset);
		return currentDataset;
	});
}
function cloneData(data, datasetIdKey) {
	const nextData = {
		labels: [],
		datasets: []
	};
	setLabels(nextData, data.labels);
	setDatasets(nextData, data.datasets, datasetIdKey);
	return nextData;
}
var Chart = defineComponent({
	props: Props,
	setup(props, param) {
		let { expose } = param;
		const canvasRef = ref(null);
		const chartRef = shallowRef(null);
		expose({ chart: chartRef });
		const renderChart = () => {
			if (!canvasRef.value) return;
			const { type, data, options, plugins, datasetIdKey } = props;
			const proxiedData = cloneProxy(cloneData(data, datasetIdKey), data);
			chartRef.value = new Chart$1(canvasRef.value, {
				type,
				data: proxiedData,
				options: { ...options },
				plugins
			});
		};
		const destroyChart = () => {
			const chart = toRaw(chartRef.value);
			if (chart) {
				chart.destroy();
				chartRef.value = null;
			}
		};
		const update = (chart) => {
			chart.update(props.updateMode);
		};
		onMounted(renderChart);
		onBeforeUnmount(destroyChart);
		watch([() => props.options, () => props.data], (param, param1) => {
			let [nextOptionsProxy, nextDataProxy] = param, [prevOptionsProxy, prevDataProxy] = param1;
			const chart = toRaw(chartRef.value);
			if (!chart) return;
			let shouldUpdate = false;
			if (nextOptionsProxy) {
				const nextOptions = toRawIfProxy(nextOptionsProxy);
				const prevOptions = toRawIfProxy(prevOptionsProxy);
				if (nextOptions && nextOptions !== prevOptions) {
					setOptions(chart, nextOptions);
					shouldUpdate = true;
				}
			}
			if (nextDataProxy) {
				const nextLabels = toRawIfProxy(nextDataProxy.labels);
				const prevLabels = toRawIfProxy(prevDataProxy.labels);
				const nextDatasets = toRawIfProxy(nextDataProxy.datasets);
				const prevDatasets = toRawIfProxy(prevDataProxy.datasets);
				if (nextLabels !== prevLabels) {
					setLabels(chart.config.data, nextLabels);
					shouldUpdate = true;
				}
				if (nextDatasets && nextDatasets !== prevDatasets) {
					setDatasets(chart.config.data, nextDatasets, props.datasetIdKey);
					shouldUpdate = true;
				}
			}
			if (shouldUpdate) update(chart);
		}, { deep: true });
		return () => {
			return h("canvas", { ref: canvasRef });
		};
	}
});
function createTypedChart(type, registerables) {
	Chart$1.register(registerables);
	return defineComponent({
		props: CommonProps,
		setup(props, param) {
			let { expose } = param;
			const ref = shallowRef(null);
			const reforwardRef = (chartRef) => {
				ref.value = chartRef?.chart;
			};
			expose({ chart: ref });
			return () => {
				return h(Chart, compatProps({ ref: reforwardRef }, {
					type,
					...props
				}));
			};
		}
	});
}
var Bar = /* #__PURE__ */ createTypedChart("bar", BarController);
var Line = /* #__PURE__ */ createTypedChart("line", LineController);
//#endregion
export { Chart as n, Line as r, Bar as t };
