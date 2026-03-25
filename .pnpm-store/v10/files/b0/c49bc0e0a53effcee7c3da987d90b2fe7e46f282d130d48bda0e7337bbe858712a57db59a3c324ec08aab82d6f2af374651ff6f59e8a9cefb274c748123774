import { version, isProxy, toRaw, defineComponent, ref, shallowRef, onMounted, onBeforeUnmount, watch, h } from 'vue';
import { Chart as Chart$1, BarController, DoughnutController, LineController, PieController, PolarAreaController, RadarController, BubbleController, ScatterController } from 'chart.js';

const CommonProps = {
    data: {
        type: Object,
        required: true
    },
    options: {
        type: Object,
        default: ()=>({})
    },
    plugins: {
        type: Array,
        default: ()=>[]
    },
    datasetIdKey: {
        type: String,
        default: "label"
    },
    updateMode: {
        type: String,
        default: undefined
    }
};
const Props = {
    type: {
        type: String,
        required: true
    },
    ...CommonProps
};

const compatProps = version[0] === "2" ? (internals, props)=>Object.assign(internals, {
        attrs: props
    }) : (internals, props)=>Object.assign(internals, props);
function toRawIfProxy(obj) {
    return isProxy(obj) ? toRaw(obj) : obj;
}
function cloneProxy(obj) {
    let src = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : obj;
    return isProxy(src) ? new Proxy(obj, {}) : obj;
}
function setOptions(chart, nextOptions) {
    const options = chart.options;
    if (options && nextOptions) {
        Object.assign(options, nextOptions);
    }
}
function setLabels(currentData, nextLabels) {
    currentData.labels = nextLabels;
}
function setDatasets(currentData, nextDatasets, datasetIdKey) {
    const addedDatasets = [];
    currentData.datasets = nextDatasets.map((nextDataset)=>{
        // given the new set, find it's current match
        const currentDataset = currentData.datasets.find((dataset)=>dataset[datasetIdKey] === nextDataset[datasetIdKey]);
        // There is no original to update, so simply add new one
        if (!currentDataset || !nextDataset.data || addedDatasets.includes(currentDataset)) {
            return {
                ...nextDataset
            };
        }
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
/**
 * Get dataset from mouse click event
 * @param chart - Chart.js instance
 * @param event - Mouse click event
 * @returns Dataset
 */ function getDatasetAtEvent(chart, event) {
    return chart.getElementsAtEventForMode(event, "dataset", {
        intersect: true
    }, false);
}
/**
 * Get single dataset element from mouse click event
 * @param chart - Chart.js instance
 * @param event - Mouse click event
 * @returns Dataset
 */ function getElementAtEvent(chart, event) {
    return chart.getElementsAtEventForMode(event, "nearest", {
        intersect: true
    }, false);
}
/**
 * Get all dataset elements from mouse click event
 * @param chart - Chart.js instance
 * @param event - Mouse click event
 * @returns Dataset
 */ function getElementsAtEvent(chart, event) {
    return chart.getElementsAtEventForMode(event, "index", {
        intersect: true
    }, false);
}

const Chart = defineComponent({
    props: Props,
    setup (props, param) {
        let { expose  } = param;
        const canvasRef = ref(null);
        const chartRef = shallowRef(null);
        expose({
            chart: chartRef
        });
        const renderChart = ()=>{
            if (!canvasRef.value) return;
            const { type , data , options , plugins , datasetIdKey  } = props;
            const clonedData = cloneData(data, datasetIdKey);
            const proxiedData = cloneProxy(clonedData, data);
            chartRef.value = new Chart$1(canvasRef.value, {
                type,
                data: proxiedData,
                options: {
                    ...options
                },
                plugins
            });
        };
        const destroyChart = ()=>{
            const chart = toRaw(chartRef.value);
            if (chart) {
                chart.destroy();
                chartRef.value = null;
            }
        };
        const update = (chart)=>{
            chart.update(props.updateMode);
        };
        onMounted(renderChart);
        onBeforeUnmount(destroyChart);
        watch([
            ()=>props.options,
            ()=>props.data
        ], (param, param1)=>{
            let [nextOptionsProxy, nextDataProxy] = param, [prevOptionsProxy, prevDataProxy] = param1;
            const chart = toRaw(chartRef.value);
            if (!chart) {
                return;
            }
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
            if (shouldUpdate) {
                update(chart);
            }
        }, {
            deep: true
        });
        return ()=>{
            return h("canvas", {
                ref: canvasRef
            });
        };
    }
});

function createTypedChart(type, registerables) {
    Chart$1.register(registerables);
    return defineComponent({
        props: CommonProps,
        setup (props, param) {
            let { expose  } = param;
            const ref = shallowRef(null);
            const reforwardRef = (chartRef)=>{
                ref.value = chartRef?.chart;
            };
            expose({
                chart: ref
            });
            return ()=>{
                return h(Chart, compatProps({
                    ref: reforwardRef
                }, {
                    type,
                    ...props
                }));
            };
        }
    });
}
const Bar = /* #__PURE__ */ createTypedChart("bar", BarController);
const Doughnut = /* #__PURE__ */ createTypedChart("doughnut", DoughnutController);
const Line = /* #__PURE__ */ createTypedChart("line", LineController);
const Pie = /* #__PURE__ */ createTypedChart("pie", PieController);
const PolarArea = /* #__PURE__ */ createTypedChart("polarArea", PolarAreaController);
const Radar = /* #__PURE__ */ createTypedChart("radar", RadarController);
const Bubble = /* #__PURE__ */ createTypedChart("bubble", BubbleController);
const Scatter = /* #__PURE__ */ createTypedChart("scatter", ScatterController);

export { Bar, Bubble, Chart, Doughnut, Line, Pie, PolarArea, Radar, Scatter, createTypedChart, getDatasetAtEvent, getElementAtEvent, getElementsAtEvent };
//# sourceMappingURL=index.js.map
