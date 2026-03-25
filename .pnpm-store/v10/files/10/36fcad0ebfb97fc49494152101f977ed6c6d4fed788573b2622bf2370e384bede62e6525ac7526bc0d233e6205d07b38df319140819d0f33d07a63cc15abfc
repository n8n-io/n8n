import { innerFrom } from '../observable/innerFrom';
import { observeOn } from '../operators/observeOn';
import { subscribeOn } from '../operators/subscribeOn';
import { InteropObservable, SchedulerLike } from '../types';

export function scheduleObservable<T>(input: InteropObservable<T>, scheduler: SchedulerLike) {
  return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
}
