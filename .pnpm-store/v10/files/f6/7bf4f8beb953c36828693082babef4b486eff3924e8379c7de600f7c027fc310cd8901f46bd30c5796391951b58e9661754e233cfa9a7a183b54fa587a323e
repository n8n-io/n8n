const isStandardBrowserEnv = () => {
	// window is only defined when it is a browser
	if (typeof window !== 'undefined') {
		// Is the process an electron application
		// check if we are in electron `renderer`
		const electronRenderCheck =
			typeof navigator !== 'undefined' &&
			navigator.userAgent?.toLowerCase().indexOf(' electron/') > -1
		if (electronRenderCheck && process?.versions) {
			const electronMainCheck = Object.prototype.hasOwnProperty.call(
				process.versions,
				'electron',
			)
			// Both electron checks are only true if the following webPreferences are set in the main electron BrowserWindow()
			//   webPreferences: {
			//     sandbox: false,
			//     nodeIntegration: true
			//     contextIsolation: false
			// }
			return !electronMainCheck
		}
		return typeof window.document !== 'undefined'
	}
	// return false if nothing is detected
	return false
}

const isWebWorkerEnv = () =>
	Boolean(
		// eslint-disable-next-line no-restricted-globals
		typeof self === 'object' &&
			// eslint-disable-next-line no-restricted-globals
			self?.constructor?.name?.includes('WorkerGlobalScope'),
	)

const isReactNativeEnv = () =>
	typeof navigator !== 'undefined' && navigator.product === 'ReactNative'

const isBrowser =
	isStandardBrowserEnv() || isWebWorkerEnv() || isReactNativeEnv()

export const isWebWorker = isWebWorkerEnv()

export const isReactNativeBrowser = isReactNativeEnv()

export default isBrowser
