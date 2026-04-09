import type { AgSingletonBean } from '../agStack/interfaces/agCoreBean';
import type { BeanCollection } from './context';
export interface Bean extends AgSingletonBean<BeanCollection> {
}
/** For any Bean that is required via auto wired or extracted by name from the Context must have a beanName */
export type NamedBean = Required<Pick<Bean, 'beanName'>>;
