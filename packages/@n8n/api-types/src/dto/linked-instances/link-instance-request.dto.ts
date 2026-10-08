import { Z } from '../../zod-class';
import {
	linkedInstanceNameSchema,
	linkedInstanceTokenSchema,
	linkedInstanceUrlSchema,
} from './linked-instance.schema';

export class LinkInstanceRequestDto extends Z.class({
	name: linkedInstanceNameSchema,
	url: linkedInstanceUrlSchema,
	token: linkedInstanceTokenSchema,
}) {}
