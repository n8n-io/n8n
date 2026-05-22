import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	CategoryScale,
	LinearScale,
	LineController,
} from 'chart.js';

export const ChartJSPlugin = {
	install: () => {
		ChartJS.register(
			CategoryScale,
			LinearScale,
			BarElement,
			LineElement,
			PointElement,
			ArcElement,
			Title,
			Tooltip,
			Legend,
			LineController,
		);
	},
};
