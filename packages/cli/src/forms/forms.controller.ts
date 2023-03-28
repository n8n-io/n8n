import { Get, Post, RestController } from '@/decorators';
import { FormsRequest } from '@/requests';
import { FormsService } from './forms.service';

@RestController('/forms')
export class FormsController {
	constructor(private formsService: FormsService) {}

	@Get('/')
	async getAll() {
		return this.formsService.getAll();
	}

	@Get('/:id(\\d+)')
	async get(req: FormsRequest.Get) {
		const { id } = req.params;

		return this.formsService.get(parseInt(id));
	}

	@Post('/')
	async create(req: FormsRequest.Create) {
		return FormsService.create(req.body);
	}
}
