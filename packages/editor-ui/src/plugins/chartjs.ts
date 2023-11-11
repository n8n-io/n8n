import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	BarElement,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
} from 'chart.js';

export const ChartJSPlugin = {
	install: () => {
		ChartJS.register(
			CategoryScale,
			LinearScale,
			BarElement,
			LineElement,
			PointElement,
			Title,
			Tooltip,
			Legend,
		);
	},
};
