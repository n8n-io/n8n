import dateformat from 'dateformat';
import { useI18n } from './useI18n';
import { useRouter } from 'vue-router';
import { useLoadingService } from './useLoadingService';

export function useGenericHelpers() {
	const i18n = useI18n();
	const loadingService = useLoadingService();

	function displayTimer(msPassed: number, showMs = false): string {
		if (msPassed < 60000) {
			if (!showMs) {
				return `${Math.floor(msPassed / 1000)}${i18n.baseText('genericHelpers.secShort')}`;
			}

			return `${msPassed / 1000}${i18n.baseText('genericHelpers.secShort')}`;
		}

		const secondsPassed = Math.floor(msPassed / 1000);
		const minutesPassed = Math.floor(secondsPassed / 60);
		const secondsLeft = (secondsPassed - minutesPassed * 60).toString().padStart(2, '0');

		return `${minutesPassed}:${secondsLeft}${i18n.baseText('genericHelpers.minShort')}`;
	}

	function convertToDisplayDate(fullDate: Date | string | number): { date: string; time: string } {
		const mask = `d mmm${
			new Date(fullDate).getFullYear() === new Date().getFullYear() ? '' : ', yyyy'
		}#HH:MM:ss`;
		const formattedDate = dateformat(fullDate, mask);
		const [date, time] = formattedDate.split('#');
		return { date, time };
	}


	function isRedirectSafe() {
		const redirect = getRedirectQueryParameter();
		return redirect.startsWith('/');
	}

	function getRedirectQueryParameter() {
		const router = useRouter();
		let redirect = '';
		if (typeof router.currentRoute.value.query.redirect === 'string') {
			redirect = decodeURIComponent(router.currentRoute.value.query.redirect);
		}
		return redirect;
	}

	return {
		loadingService: loadingService.loadingService,
		isLoading: loadingService.isLoading,
		displayTimer,
		convertToDisplayDate,
		isRedirectSafe,
		getRedirectQueryParameter,
		startLoading: loadingService.startLoading,
		setLoadingText: loadingService.setLoadingText,
		stopLoading: loadingService.stopLoading,
	};
}
