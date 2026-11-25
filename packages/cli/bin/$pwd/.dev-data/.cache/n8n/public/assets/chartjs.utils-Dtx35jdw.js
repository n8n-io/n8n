import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { ha as require_merge, ku as useCssVar } from "./vendor-Hx42-oQF.js";
import { t as smartDecimal } from "./smart-decimal-EivKoUgC.js";
//#region ../../modules/insights/frontend/src/chartjs.utils.ts
var import_merge = /* @__PURE__ */ __toESM(require_merge(), 1);
/**
*
* Chart js configuration
*/
var generateLinearGradient = (ctx, height) => {
	const gradient = ctx.createLinearGradient(0, 0, 0, height);
	gradient.addColorStop(0, "rgba(255, 111,92, 1)");
	gradient.addColorStop(.8, "rgba(255, 111, 92, 0.25)");
	gradient.addColorStop(1, "rgba(255, 111, 92, 0)");
	return gradient;
};
var generateLineChartOptions = (overrides = {}) => {
	const colorTextDark = useCssVar("--color--text--shade-1", document.body);
	const colorBackgroundLight = useCssVar("--color--background--light-3", document.body);
	const colorForeGroundBase = useCssVar("--color--foreground", document.body);
	const colorTextLight = useCssVar("--color--text--tint-1", document.body);
	return (0, import_merge.default)({
		responsive: true,
		maintainAspectRatio: false,
		animation: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				caretSize: 0,
				xAlign: "center",
				yAlign: "bottom",
				padding: 16,
				titleFont: { size: 14 },
				bodyFont: { size: 14 },
				backgroundColor: colorBackgroundLight.value,
				titleColor: colorTextDark.value,
				bodyColor: colorTextDark.value,
				borderWidth: 1,
				borderColor: colorForeGroundBase.value,
				callbacks: {
					label(context) {
						return `${context.dataset.label ?? ""} ${smartDecimal(context.parsed.y).toLocaleString("en-US")}`;
					},
					labelColor(context) {
						return {
							borderColor: "rgba(0, 0, 0, 0)",
							backgroundColor: context.dataset.backgroundColor,
							borderWidth: 0,
							borderRadius: 2
						};
					}
				}
			}
		},
		interaction: {
			mode: "nearest",
			axis: "x",
			intersect: false
		},
		scales: {
			x: {
				grid: { display: false },
				stacked: true,
				beginAtZero: true,
				border: { display: false },
				ticks: { color: colorTextLight.value }
			},
			y: {
				grid: { color: colorForeGroundBase.value },
				stacked: true,
				border: { display: false },
				ticks: {
					maxTicksLimit: 3,
					color: colorTextLight.value
				}
			}
		}
	}, overrides);
};
var generateBarChartOptions = (overrides = {}) => {
	const colorTextLight = useCssVar("--color--text--tint-1", document.body);
	const colorTextDark = useCssVar("--color--text--shade-1", document.body);
	const colorBackgroundLight = useCssVar("--color--background--light-3", document.body);
	const colorForeGroundBase = useCssVar("--color--foreground", document.body);
	return (0, import_merge.default)({
		responsive: true,
		maintainAspectRatio: false,
		animation: false,
		plugins: {
			legend: {
				display: true,
				align: "end",
				reverse: true,
				position: "top",
				labels: {
					boxWidth: 8,
					boxHeight: 8,
					borderRadius: 2,
					useBorderRadius: true,
					color: colorTextLight.value
				}
			},
			tooltip: {
				caretSize: 0,
				xAlign: "center",
				yAlign: "bottom",
				padding: 16,
				titleFont: { size: 14 },
				bodyFont: { size: 14 },
				backgroundColor: colorBackgroundLight.value,
				titleColor: colorTextDark.value,
				bodyColor: colorTextDark.value,
				borderWidth: 1,
				borderColor: colorForeGroundBase.value,
				callbacks: {
					label(context) {
						return `${context.dataset.label ?? ""} ${context.parsed.y}`;
					},
					labelColor(context) {
						return {
							borderColor: "rgba(0, 0, 0, 0)",
							backgroundColor: context.dataset.backgroundColor,
							borderWidth: 0,
							borderRadius: 2
						};
					}
				}
			}
		},
		interaction: {
			mode: "nearest",
			axis: "x",
			intersect: false
		},
		datasets: { bar: {
			maxBarThickness: 32,
			borderRadius: 4
		} },
		scales: {
			x: {
				grid: { display: false },
				stacked: true,
				beginAtZero: true,
				border: { display: false },
				ticks: { color: colorTextLight.value }
			},
			y: {
				grid: { color: colorForeGroundBase.value },
				stacked: true,
				border: { display: false },
				ticks: {
					maxTicksLimit: 3,
					color: colorTextLight.value
				}
			}
		}
	}, overrides);
};
//#endregion
export { generateLineChartOptions as n, generateLinearGradient as r, generateBarChartOptions as t };
