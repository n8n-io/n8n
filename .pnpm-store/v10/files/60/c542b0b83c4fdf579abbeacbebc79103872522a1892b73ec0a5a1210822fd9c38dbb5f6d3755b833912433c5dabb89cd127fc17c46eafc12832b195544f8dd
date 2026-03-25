import type { InjectionKey, Ref } from 'vue';
import type { CarouselItemProps } from './carousel-item';
export declare type CarouselItemStates = {
    hover: boolean;
    translate: number;
    scale: number;
    active: boolean;
    ready: boolean;
    inStage: boolean;
    animating: boolean;
};
export declare type CarouselItemContext = {
    props: CarouselItemProps;
    states: CarouselItemStates;
    uid: number;
    translateItem: (index: number, activeIndex: number, oldIndex?: number) => void;
};
export declare type CarouselContext = {
    root: Ref<HTMLElement | undefined>;
    items: Ref<CarouselItemContext[]>;
    isCardType: Ref<boolean>;
    isVertical: Ref<boolean>;
    loop: boolean;
    addItem: (item: CarouselItemContext) => void;
    removeItem: (uid: number) => void;
    setActiveItem: (index: number) => void;
    setContainerHeight: (height: number) => void;
};
export declare const carouselContextKey: InjectionKey<CarouselContext>;
