import type { BeanCollection, BeanName } from './context';
import type { GenericBean } from './genericBean';
export interface Bean extends GenericBean<BeanName, BeanCollection> {
}
/** For any Bean that is required via auto wired or extracted by name from the Context must have a beanName */
export type NamedBean = Required<Pick<Bean, 'beanName'>>;
