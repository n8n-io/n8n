import { SchedulerLike } from '../types';
import { isFunction } from './isFunction';

export function isScheduler(value: any): value is SchedulerLike {
  return value && isFunction(value.schedule);
}
