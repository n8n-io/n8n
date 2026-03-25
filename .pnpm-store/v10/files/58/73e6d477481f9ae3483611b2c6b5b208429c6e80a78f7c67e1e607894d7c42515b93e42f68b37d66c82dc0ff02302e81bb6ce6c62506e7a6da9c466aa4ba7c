import * as react from 'react';

type ParticleShape = 'mix' | 'circles' | 'rectangles';
type ConfettiOptions = {
    /**
     * Number of confetti particles to create
     *
     * @default 150
     */
    particleCount?: number;
    /**
     * Shape of particles to use. Can be `mix`, `circles` or `rectangles`
     *
     * `mix` will use both circles and rectangles
     * `circles` will use only circles
     * `rectangles` will use only rectangles
     *
     * @default 'mix'
     */
    particleShape?: ParticleShape;
    /**
     * Size of the confetti particles in pixels
     *
     * @default 12
     */
    particleSize?: number;
    /**
     * Class to apply to each confetti particle
     *
     * @default undefined
     */
    particleClass?: string;
    /**
     * Duration of the animation in milliseconds
     *
     * @default 3500
     */
    duration?: number;
    /**
     * Colors to use for the confetti particles. Pass string array of colors. Can use hex colors, named colors,
     * CSS Variables, literally anything valid in plain CSS.
     *
     * @default ['#FFC700', '#FF0000', '#2E3191', '#41BBC7']
     */
    colors?: string[];
    /**
     * Force of the confetti particles. Between 0 and 1. 0 is no force, 1 is maximum force.
     *
     * @default 0.5
     */
    force?: number;
    /**
     * Height of the stage in pixels. Confetti will only fall within this height.
     *
     * @default 800
     */
    stageHeight?: number;
    /**
     * Width of the stage in pixels. Confetti will only fall within this width.
     *
     * @default 1600
     */
    stageWidth?: number;
    /**
     * Whether or not destroy all confetti nodes after the `duration` period has passed. By default it destroys all nodes, to preserve memory.
     *
     * @default true
     */
    destroyAfterDone?: boolean;
};

interface ConfettiProps extends ConfettiOptions {
    class?: string;
}
declare function Confetti({ class: className, ...options }: ConfettiProps): react.DetailedReactHTMLElement<{
    ref: react.RefObject<HTMLElement>;
    className: string | undefined;
}, HTMLElement>;

export { Confetti, type ParticleShape as ConfettiParticleShape, type ConfettiProps };
