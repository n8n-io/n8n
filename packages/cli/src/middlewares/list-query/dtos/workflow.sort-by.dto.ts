import type { ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { IsString, Validate, ValidatorConstraint } from 'class-validator';

@ValidatorConstraint({ name: 'WorkflowSortByParameter', async: false })
export class WorkflowSortByParameter implements ValidatorConstraintInterface {
	validate(text: string, _: ValidationArguments) {
		const [column, order] = text.split(':');
		if (!column || !order) return false;

		return ['name', 'createdAt', 'updatedAt'].includes(column) && ['asc', 'desc'].includes(order);
	}

	defaultMessage(_: ValidationArguments) {
		return 'Invalid value for sortBy parameter';
	}
}

export class WorkflowSorting {
	@IsString()
	@Validate(WorkflowSortByParameter)
	sortBy?: string;
}
