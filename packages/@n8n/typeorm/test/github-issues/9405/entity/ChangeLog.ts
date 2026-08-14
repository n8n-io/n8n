import { OneToMany, ChildEntity } from '../../../../src/index';
import { Change } from './Change';
import { Log } from './Log';

@ChildEntity()
export abstract class ChangeLog<T> extends Log {
	@OneToMany(
		() => Change,
		(change) => change.log,
		{ cascade: true },
	)
	changes: Change<T>[];
}
