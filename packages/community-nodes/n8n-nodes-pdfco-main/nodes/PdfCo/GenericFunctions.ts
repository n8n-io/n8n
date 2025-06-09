import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

async function delay(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	ms: number
): Promise<void> {
	await pdfcoApiRequest.call(this, '/v1/delay', {}, 'GET', { val: ms });
}

export async function pdfcoApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	url: string,
	body: any = {},
	method: IHttpRequestMethods = 'POST',
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('pdfcoApi');
	let options: IRequestOptions = {
		baseURL: 'https://api.pdf.co',
		url: url,
		headers: {
			'content-type': 'application/json',
			'x-api-key': credentials.apiKey,
			'user-agent': 'n8n/1.0.3',
		},
		method,
		qs,
		body,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make pdf.co API call with Job/Check
 */
export async function pdfcoApiRequestWithJobCheck(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	url: string,
	body: any = {},
	method: IHttpRequestMethods = 'POST',
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	const mainRequestResp = await pdfcoApiRequest.call(this, url, body, method, qs, option);

	if (mainRequestResp.error) {
		throw new NodeApiError(this.getNode(), mainRequestResp as JsonObject);
	}

	// If JobId field not present, return as it is
	if (!mainRequestResp.jobId) {
		return cleanUpResponse(mainRequestResp);
	}

	// Short-Circuit if callback URL is provided
	if (body.callback) {
		return mainRequestResp;
	}

	let jobCheckResp: any = { status: 'none' };

	do {
		// Check job response
		jobCheckResp = await pdfcoApiRequest.call(this, '/v1/job/check', {
			jobid: mainRequestResp.jobId,
		});

		if (
			jobCheckResp.status == 'failed' ||
			jobCheckResp.status == 'aborted' ||
			jobCheckResp.status == 'unknown' // this should not happen but still can if there were super high load
		) {
			break;
		}

		if (jobCheckResp.status === 'working') {
			await delay.call(this, 3000);
		}
	} while (jobCheckResp.status === 'working');

	if (jobCheckResp.status === 'success') {
		// Preserve the name parameter from the initial response if it exists
		if (mainRequestResp.name) {
			jobCheckResp.name = mainRequestResp.name;
		}
		return cleanUpResponse(jobCheckResp);
	} else {
		throw new NodeApiError(this.getNode(), jobCheckResp as JsonObject);
	}
}

function cleanUpResponse(data: any): any {
	// if data has a jobId, remove it
	if (data.jobId) {
		delete data.jobId;
	}

	// if data has a status, remove it
	if (data.status) {
		delete data.status;
	}

	// if data has a message, remove it
	if (data.message) {
		delete data.message;
	}

	// if data has credits, remove it
	if (data.credits) {
		delete data.credits;
	}

	// if data has remainingCredits, remove it
	if (data.remainingCredits) {
		delete data.remainingCredits;
	}

	return data;
}

export function sanitizeProfiles(data: IDataObject): void {
	// Convert profiles to a trimmed string (or empty string if not provided)
	const profilesValue = data.profiles ? String(data.profiles).trim() : '';

	// If the profiles field is empty, remove it from the payload
	if (!profilesValue) {
		delete data.profiles;
		return;
	}

	try {
		// Wrap profiles in curly braces if they are not already
		let sanitized = profilesValue;
		if (!sanitized.startsWith('{')) {
			sanitized = `{ ${sanitized}`;
		}
		if (!sanitized.endsWith('}')) {
			sanitized = `${sanitized} }`;
		}
		data.profiles = sanitized;
	} catch (error) {
		throw new Error(
			'Invalid JSON in Profiles. Check https://developer.pdf.co/api/profiles/ or contact support@pdf.co for help. ' +
				(error as Error).message,
		);
	}
}

export class ActionConstants {
	public static readonly AiInvoiceParser: string = 'AI Invoice Parser';
	public static readonly MergePdf: string = 'Merge PDF';
	public static readonly SplitPdf: string = 'Split PDF';
	public static readonly UrlHtmlToPDF: string = 'URL/HTML to PDF';
	public static readonly ConvertToPDF: string = 'Convert to PDF';
	public static readonly ConvertFromPDF: string = 'Convert from PDF';
	public static readonly AddTextImagesToPDF: string = 'Add Text/Images to PDF';
	public static readonly FillPdfForm: string = 'Fill a PDF Form';
	public static readonly PDFInfo: string = 'PDF Information & Form Fields';
	public static readonly CompressPdf: string = 'Compress PDF';
	public static readonly PDFSecurity: string = 'PDF Security';
	public static readonly RotatePdf: string = 'Rotate PDF Pages';
	public static readonly DeletePdfPages: string = 'Delete PDF Pages';
	public static readonly SearchPdf: string = 'Search in PDF';
	public static readonly SearchAndReplaceDelete: string = 'Search & Replace Text or Delete';
	public static readonly BarcodeReader: string = 'Barcode Reader';
	public static readonly BarcodeGenerator: string = 'Barcode Generator';
	public static readonly MakePdfSearchable: string = 'Make PDF Searchable or Unsearchable';
	public static readonly UploadFile: string = 'Upload File to PDF.co';
}

export async function loadResource(this: ILoadOptionsFunctions, resource: string): Promise<any> {
	if (resource === 'fonts') {
		return [
			{ name: '', value: '' },
			{ name: 'Aldhabi', value: 'Aldhabi' },
			{ name: 'Andalus', value: 'Andalus' },
			{ name: 'Arabic Typesetting', value: 'Arabic Typesetting' },
			{ name: 'Arial', value: 'Arial' },
			{ name: 'Arial Black', value: 'Arial Black' },
			{ name: 'Bahnschrift', value: 'Bahnschrift' },
			{ name: 'Calibri', value: 'Calibri' },
			{ name: 'Cambria', value: 'Cambria' },
			{ name: 'Cambria Math', value: 'Cambria Math' },
			{ name: 'Candara', value: 'Candara' },
			{ name: 'Comic Sans MS', value: 'Comic Sans MS' },
			{ name: 'Consolas', value: 'Consolas' },
			{ name: 'Constantia', value: 'Constantia' },
			{ name: 'Corbel', value: 'Corbel' },
			{ name: 'Courier New', value: 'Courier New' },
			{ name: 'Ebrima', value: 'Ebrima' },
			{ name: 'Franklin Gothic Medium', value: 'Franklin Gothic Medium' },
			{ name: 'Gabriola', value: 'Gabriola' },
			{ name: 'Gadugi', value: 'Gadugi' },
			{ name: 'Georgia', value: 'Georgia' },
			{ name: 'HoloLens MDL2 Assets', value: 'HoloLens MDL2 Assets' },
			{ name: 'Impact', value: 'Impact' },
			{ name: 'Ink Free', value: 'Ink Free' },
			{ name: 'Javanese Text', value: 'Javanese Text' },
			{ name: 'Leelawadee UI', value: 'Leelawadee UI' },
			{ name: 'Lucida Console', value: 'Lucida Console' },
			{ name: 'Lucida Sans Unicode', value: 'Lucida Sans Unicode' },
			{ name: 'Malgun Gothic', value: 'Malgun Gothic' },
			{ name: 'Marlett', value: 'Marlett' },
			{ name: 'Microsoft Himalaya', value: 'Microsoft Himalaya' },
			{ name: 'Microsoft JhengHei', value: 'Microsoft JhengHei' },
			{ name: 'Microsoft New Tai Lue', value: 'Microsoft New Tai Lue' },
			{ name: 'Microsoft PhagsPa', value: 'Microsoft PhagsPa' },
			{ name: 'Microsoft Sans Serif', value: 'Microsoft Sans Serif' },
			{ name: 'Microsoft Tai Le', value: 'Microsoft Tai Le' },
			{ name: 'Microsoft YaHei', value: 'Microsoft YaHei' },
			{ name: 'Microsoft Yi Baiti', value: 'Microsoft Yi Baiti' },
			{ name: 'MingLiU', value: 'MingLiU' },
			{ name: 'MingLiU-ExtB', value: 'MingLiU-ExtB' },
			{ name: 'Miriam', value: 'Miriam' },
			{ name: 'Mongolian Baiti', value: 'Mongolian Baiti' },
			{ name: 'MS Gothic', value: 'MS Gothic' },
			{ name: 'MS Mincho', value: 'MS Mincho' },
			{ name: 'MV Boli', value: 'MV Boli' },
			{ name: 'Myanmar Text', value: 'Myanmar Text' },
			{ name: 'Nirmala UI', value: 'Nirmala UI' },
			{ name: 'Palatino Linotype', value: 'Palatino Linotype' },
			{ name: 'Segoe MDL2 Assets', value: 'Segoe MDL2 Assets' },
			{ name: 'Segoe Print', value: 'Segoe Print' },
			{ name: 'Segoe Script', value: 'Segoe Script' },
			{ name: 'Segoe UI', value: 'Segoe UI' },
			{ name: 'Segoe UI Emoji', value: 'Segoe UI Emoji' },
			{ name: 'Segoe UI Historic', value: 'Segoe UI Historic' },
			{ name: 'Segoe UI Symbol', value: 'Segoe UI Symbol' },
			{ name: 'SimSun', value: 'SimSun' },
			{ name: 'Sitka', value: 'Sitka' },
			{ name: 'Sylfaen', value: 'Sylfaen' },
			{ name: 'Symbol', value: 'Symbol' },
			{ name: 'Tahoma', value: 'Tahoma' },
			{ name: 'Times New Roman', value: 'Times New Roman' },
			{ name: 'Trebuchet MS', value: 'Trebuchet MS' },
			{ name: 'Verdana', value: 'Verdana' },
			{ name: 'Webdings', value: 'Webdings' },
			{ name: 'Wingdings', value: 'Wingdings' },
			{ name: 'Yu Gothic', value: 'Yu Gothic' },
		];
	}
	if (resource === 'languages') {
		return [
			{ name: '', value: '' },
			{ name: 'Afrikaans', value: 'afr' },
			{ name: 'Amharic', value: 'amh' },
			{ name: 'Arabic', value: 'ara' },
			{ name: 'Assamese', value: 'asm' },
			{ name: 'Azerbaijani', value: 'aze' },
			{ name: 'Azerbaijani - Cyrillic', value: 'aze_cyrl' },
			{ name: 'Belarusian', value: 'bel' },
			{ name: 'Bengali', value: 'ben' },
			{ name: 'Tibetan', value: 'bod' },
			{ name: 'Bosnian', value: 'bos' },
			{ name: 'Bulgarian', value: 'bul' },
			{ name: 'Catalan; Valencian', value: 'cat' },
			{ name: 'Cebuano', value: 'ceb' },
			{ name: 'Czech', value: 'ces' },
			{ name: 'Chinese - Simplified', value: 'chi_sim' },
			{ name: 'Chinese - Traditional', value: 'chi_tra' },
			{ name: 'Cherokee', value: 'chr' },
			{ name: 'Welsh', value: 'cym' },
			{ name: 'Danish', value: 'dan' },
			{ name: 'German', value: 'deu' },
			{ name: 'Dzongkha', value: 'dzo' },
			{ name: 'Greek, Modern (1453-)', value: 'ell' },
			{ name: 'English', value: 'eng' },
			{ name: 'English, Middle (1100-1500)', value: 'enm' },
			{ name: 'Esperanto', value: 'epo' },
			{ name: 'Estonian', value: 'est' },
			{ name: 'Basque', value: 'eus' },
			{ name: 'Persian', value: 'fas' },
			{ name: 'Finnish', value: 'fin' },
			{ name: 'French', value: 'fra' },
			{ name: 'Frankish', value: 'frk' },
			{ name: 'French, Middle (ca. 1400-1600)', value: 'frm' },
			{ name: 'Irish', value: 'gle' },
			{ name: 'Galician', value: 'glg' },
			{ name: 'Greek, Ancient (-1453)', value: 'grc' },
			{ name: 'Gujarati', value: 'guj' },
			{ name: 'Haitian; Haitian Creole', value: 'hat' },
			{ name: 'Hebrew', value: 'heb' },
			{ name: 'Hindi', value: 'hin' },
			{ name: 'Croatian', value: 'hrv' },
			{ name: 'Hungarian', value: 'hun' },
			{ name: 'Inuktitut', value: 'iku' },
			{ name: 'Indonesian', value: 'ind' },
			{ name: 'Icelandic', value: 'isl' },
			{ name: 'Italian', value: 'ita' },
			{ name: 'Italian - Old', value: 'ita_old' },
			{ name: 'Javanese', value: 'jav' },
			{ name: 'Japanese', value: 'jpn' },
			{ name: 'Kannada', value: 'kan' },
			{ name: 'Georgian', value: 'kat' },
			{ name: 'Georgian - Old', value: 'kat_old' },
			{ name: 'Kazakh', value: 'kaz' },
			{ name: 'Central Khmer', value: 'khm' },
			{ name: 'Kirghiz; Kyrgyz', value: 'kir' },
			{ name: 'Korean', value: 'kor' },
			{ name: 'Kurdish', value: 'kur' },
			{ name: 'Lao', value: 'lao' },
			{ name: 'Latin', value: 'lat' },
			{ name: 'Latvian', value: 'lav' },
			{ name: 'Lithuanian', value: 'lit' },
			{ name: 'Malayalam', value: 'mal' },
			{ name: 'Marathi', value: 'mar' },
			{ name: 'Macedonian', value: 'mkd' },
			{ name: 'Maltese', value: 'mlt' },
			{ name: 'Malay', value: 'msa' },
			{ name: 'Burmese', value: 'mya' },
			{ name: 'Nepali', value: 'nep' },
			{ name: 'Dutch; Flemish', value: 'nld' },
			{ name: 'Norwegian', value: 'nor' },
			{ name: 'Oriya', value: 'ori' },
			{ name: 'Panjabi; Punjabi', value: 'pan' },
			{ name: 'Polish', value: 'pol' },
			{ name: 'Portuguese', value: 'por' },
			{ name: 'Pushto; Pashto', value: 'pus' },
			{ name: 'Romanian; Moldavian; Moldovan', value: 'ron' },
			{ name: 'Russian', value: 'rus' },
			{ name: 'Sanskrit', value: 'san' },
			{ name: 'Sinhala; Sinhalese', value: 'sin' },
			{ name: 'Slovak', value: 'slk' },
			{ name: 'Slovenian', value: 'slv' },
			{ name: 'Spanish; Castilian', value: 'spa' },
			{ name: 'Spanish; Castilian - Old', value: 'spa_old' },
			{ name: 'Albanian', value: 'sqi' },
			{ name: 'Serbian', value: 'srp' },
			{ name: 'Serbian - Latin', value: 'srp_latn' },
			{ name: 'Swahili', value: 'swa' },
			{ name: 'Swedish', value: 'swe' },
			{ name: 'Syriac', value: 'syr' },
			{ name: 'Tamil', value: 'tam' },
			{ name: 'Telugu', value: 'tel' },
			{ name: 'Tajik', value: 'tgk' },
			{ name: 'Tagalog', value: 'tgl' },
			{ name: 'Thai', value: 'tha' },
			{ name: 'Tigrinya', value: 'tir' },
			{ name: 'Turkish', value: 'tur' },
			{ name: 'Uighur; Uyghur', value: 'uig' },
			{ name: 'Ukrainian', value: 'ukr' },
			{ name: 'Urdu', value: 'urd' },
			{ name: 'Uzbek', value: 'uzb' },
			{ name: 'Uzbek - Cyrillic', value: 'uzb_cyrl' },
			{ name: 'Vietnamese', value: 'vie' },
			{ name: 'Yiddish', value: 'yid' }
		];
	}
	return [];
}
