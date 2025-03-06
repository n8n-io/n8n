import dateformat from 'dateformat';

export const convertToDisplayDateComponents = (
	fullDate: Date | string | number,
): { date: string; time: string } => {
	const mask = `d mmm${
		new Date(fullDate).getFullYear() === new Date().getFullYear() ? '' : ', yyyy'
	}#HH:MM:ss`;
	const formattedDate = dateformat(fullDate, mask);
	const [date, time] = formattedDate.split('#');
	return { date, time };
};

export function convertToDisplayDate(fullDate: Date | string | number): {
	date: string;
	time: string;
} {
	const mask = `d mmm${
		new Date(fullDate).getFullYear() === new Date().getFullYear() ? '' : ', yyyy'
	}#HH:MM:ss`;
	const formattedDate = dateformat(fullDate, mask);
	const [date, time] = formattedDate.split('#');
	return { date, time };
}

export const toDayMonth = (fullDate: Date | string) => dateformat(fullDate, 'd mmm');

export const toTime = (fullDate: Date | string) => dateformat(fullDate, 'HH:MM:ss');
