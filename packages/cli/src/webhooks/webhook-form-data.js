'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.createMultiFormDataParser = void 0;
const formidable_1 = __importDefault(require('formidable'));
const normalizeFormData = (values) => {
	for (const key in values) {
		const value = values[key];
		if (Array.isArray(value) && value.length === 1) {
			values[key] = value[0];
		}
	}
};
const createMultiFormDataParser = (maxFormDataSizeInMb) => {
	return async function parseMultipartFormData(req) {
		const { encoding } = req;
		const form = (0, formidable_1.default)({
			multiples: true,
			encoding: encoding,
			maxFileSize: maxFormDataSizeInMb * 1024 * 1024,
		});
		return await new Promise((resolve) => {
			form.parse(req, async (_err, data, files) => {
				normalizeFormData(data);
				normalizeFormData(files);
				resolve({ data, files });
			});
		});
	};
};
exports.createMultiFormDataParser = createMultiFormDataParser;
//# sourceMappingURL=webhook-form-data.js.map
