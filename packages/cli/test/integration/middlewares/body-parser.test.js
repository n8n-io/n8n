'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const http_1 = require('http');
const supertest_1 = __importDefault(require('supertest'));
const zlib_1 = require('zlib');
const body_parser_1 = require('@/middlewares/body-parser');
describe('bodyParser', () => {
	const server = (0, http_1.createServer)((req, res) => {
		void (0, body_parser_1.rawBodyReader)(req, res, async () => {
			void (0, body_parser_1.bodyParser)(req, res, () => res.end(JSON.stringify(req.body)));
		});
	});
	it('should handle uncompressed data', async () => {
		const response = await (0, supertest_1.default)(server)
			.post('/')
			.send({ hello: 'world' })
			.expect(200);
		expect(response.text).toEqual('{"hello":"world"}');
	});
	it('should handle gzip data', async () => {
		const response = await (0, supertest_1.default)(server)
			.post('/')
			.set('content-encoding', 'gzip')
			.serialize((d) => (0, zlib_1.gzipSync)(JSON.stringify(d)))
			.send({ hello: 'world' })
			.expect(200);
		expect(response.text).toEqual('{"hello":"world"}');
	});
	it('should handle deflate data', async () => {
		const response = await (0, supertest_1.default)(server)
			.post('/')
			.set('content-encoding', 'deflate')
			.serialize((d) => (0, zlib_1.deflateSync)(JSON.stringify(d)))
			.send({ hello: 'world' })
			.expect(200);
		expect(response.text).toEqual('{"hello":"world"}');
	});
});
//# sourceMappingURL=body-parser.test.js.map
