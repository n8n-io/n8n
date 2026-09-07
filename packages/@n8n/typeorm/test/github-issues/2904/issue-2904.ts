import { DeepPartial } from '../../../src';
import { Comment } from './entity/Comment';

describe('github issues > #2904 Type DeepPartial issue when used with generics', () => {
	it('DeepPartial should correctly handle generics', () => {
		function commentFactory<E extends Comment>(entity: DeepPartial<E>) {
			entity.createdAt = new Date();
			entity.savedBy = 'SomeUSer';
		}

		commentFactory({});
	});
});
