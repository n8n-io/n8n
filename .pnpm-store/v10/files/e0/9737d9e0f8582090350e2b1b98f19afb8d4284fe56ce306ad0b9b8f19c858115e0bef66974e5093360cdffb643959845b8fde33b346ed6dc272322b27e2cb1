'use strict';

var vue = require('vue');
var chart_js = require('chart.js');

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

const compatProps = vue.version[0] === "2" ? (internals, props)=>Object.assign(internals, {
        attrs: props
    }) : (internals, props)=>Object.assign(internals, props);
function toRawIfProxy(obj) {
    return vue.isProxy(obj) ? vue.toRaw(obj) : obj;
}
function cloneProxy(obj) {
    let src = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : obj;
    return vue.isProxy(src) ? new Proxy(obj, {}) : obj;
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

const Chart = vue.defineComponent({
    props: Props,
    setup (props, param) {
        let { expose  } = param;
        const canvasRef = vue.ref(null);
        const chartRef = vue.shallowRef(null);
        expose({
            chart: chartRef
        });
        const renderChart = ()=>{
            if (!canvasRef.value) return;
            const { type , data , options , plugins , datasetIdKey  } = props;
            const clonedData = cloneData(data, datasetIdKey);
            const proxiedData = cloneProxy(clonedData, data);
            chartRef.value = new chart_js.Chart(canvasRef.value, {
                type,
                data: proxiedData,
                options: {
                    ...options
                },
                plugins
            });
        };
        const destroyChart = ()=>{
            const chart = vue.toRaw(chartRef.value);
            if (chart) {
                chart.destroy();
                chartRef.value = null;
            }
        };
        const update = (chart)=>{
            chart.update(props.updateMode);
        };
        vue.onMounted(renderChart);
        vue.onBeforeUnmount(destroyChart);
        vue.watch([
            ()=>props.options,
            ()=>props.data
        ], (param, param1)=>{
            let [nextOptionsProxy, nextDataProxy] = param, [prevOptionsProxy, prevDataProxy] = param1;
            const chart = vue.toRaw(chartRef.value);
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
            return vue.h("canvas", {
                ref: canvasRef
            });
        };
    }
});

function createTypedChart(type, registerables) {
    chart_js.Chart.register(registerables);
    return vue.defineComponent({
        props: CommonProps,
        setup (props, param) {
            let { expose  } = param;
            const ref = vue.shallowRef(null);
            const reforwardRef = (chartRef)=>{
                ref.value = chartRef?.chart;
            };
            expose({
                chart: ref
            });
            return ()=>{
                return vue.h(Chart, compatProps({
                    ref: reforwardRef
                }, {
                    type,
                    ...props
                }));
            };
        }
    });
}
const Bar = /* #__PURE__ */ createTypedChart("bar", chart_js.BarController);
const Doughnut = /* #__PURE__ */ createTypedChart("doughnut", chart_js.DoughnutController);
const Line = /* #__PURE__ */ createTypedChart("line", chart_js.LineController);
const Pie = /* #__PURE__ */ createTypedChart("pie", chart_js.PieController);
const PolarArea = /* #__PURE__ */ createTypedChart("polarArea", chart_js.PolarAreaController);
const Radar = /* #__PURE__ */ createTypedChart("radar", chart_js.RadarController);
const Bubble = /* #__PURE__ */ createTypedChart("bubble", chart_js.BubbleController);
const Scatter = /* #__PURE__ */ createTypedChart("scatter", chart_js.ScatterController);

exports.Bar = Bar;
exports.Bubble = Bubble;
exports.Chart = Chart;
exports.Doughnut = Doughnut;
exports.Line = Line;
exports.Pie = Pie;
exports.PolarArea = PolarArea;
exports.Radar = Radar;
exports.Scatter = Scatter;
exports.createTypedChart = createTypedChart;
exports.getDatasetAtEvent = getDatasetAtEvent;
exports.getElementAtEvent = getElementAtEvent;
exports.getElementsAtEvent = getElementsAtEvent;
//# sourceMappingURL=index.cjs.map
