import { Get, RestController } from '@/decorators';
import { FormsService } from './forms.service';

@RestController('/forms')
export class FormsController {
	constructor(private formsService: FormsService) {}

	@Get('/')
	async getAll() {
		return this.formsService.getAll();
	}
}
