import {
  createProviderToolFactory,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

const computer_20250124InputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      action: z.enum([
        'key',
        'hold_key',
        'type',
        'cursor_position',
        'mouse_move',
        'left_mouse_down',
        'left_mouse_up',
        'left_click',
        'left_click_drag',
        'right_click',
        'middle_click',
        'double_click',
        'triple_click',
        'scroll',
        'wait',
        'screenshot',
      ]),
      coordinate: z.tuple([z.number().int(), z.number().int()]).optional(),
      duration: z.number().optional(),
      scroll_amount: z.number().optional(),
      scroll_direction: z.enum(['up', 'down', 'left', 'right']).optional(),
      start_coordinate: z
        .tuple([z.number().int(), z.number().int()])
        .optional(),
      text: z.string().optional(),
    }),
  ),
);

export const computer_20250124 = createProviderToolFactory<
  {
    /**
     * - `key`: Press a key or key-combination on the keyboard.
     *   - This supports xdotool's `key` syntax.
     *   - Examples: "a", "Return", "alt+Tab", "ctrl+s", "Up", "KP_0" (for the numpad 0 key).
     * - `hold_key`: Hold down a key or multiple keys for a specified duration (in seconds). Supports the same syntax as `key`.
     * - `type`: Type a string of text on the keyboard.
     * - `cursor_position`: Get the current (x, y) pixel coordinate of the cursor on the screen.
     * - `mouse_move`: Move the cursor to a specified (x, y) pixel coordinate on the screen.
     * - `left_mouse_down`: Press the left mouse button.
     * - `left_mouse_up`: Release the left mouse button.
     * - `left_click`: Click the left mouse button at the specified (x, y) pixel coordinate on the screen. You can also include a key combination to hold down while clicking using the `text` parameter.
     * - `left_click_drag`: Click and drag the cursor from `start_coordinate` to a specified (x, y) pixel coordinate on the screen.
     * - `right_click`: Click the right mouse button at the specified (x, y) pixel coordinate on the screen.
     * - `middle_click`: Click the middle mouse button at the specified (x, y) pixel coordinate on the screen.
     * - `double_click`: Double-click the left mouse button at the specified (x, y) pixel coordinate on the screen.
     * - `triple_click`: Triple-click the left mouse button at the specified (x, y) pixel coordinate on the screen.
     * - `scroll`: Scroll the screen in a specified direction by a specified amount of clicks of the scroll wheel, at the specified (x, y) pixel coordinate. DO NOT use PageUp/PageDown to scroll.
     * - `wait`: Wait for a specified duration (in seconds).
     * - `screenshot`: Take a screenshot of the screen.
     */
    action:
      | 'key'
      | 'hold_key'
      | 'type'
      | 'cursor_position'
      | 'mouse_move'
      | 'left_mouse_down'
      | 'left_mouse_up'
      | 'left_click'
      | 'left_click_drag'
      | 'right_click'
      | 'middle_click'
      | 'double_click'
      | 'triple_click'
      | 'scroll'
      | 'wait'
      | 'screenshot';

    /**
     * (x, y): The x (pixels from the left edge) and y (pixels from the top edge) coordinates to move the mouse to. Required only by `action=mouse_move` and `action=left_click_drag`.
     */
    coordinate?: [number, number];

    /**
     * The duration to hold the key down for. Required only by `action=hold_key` and `action=wait`.
     */
    duration?: number;

    /**
     * The number of 'clicks' to scroll. Required only by `action=scroll`.
     */
    scroll_amount?: number;

    /**
     * The direction to scroll the screen. Required only by `action=scroll`.
     */
    scroll_direction?: 'up' | 'down' | 'left' | 'right';

    /**
     * (x, y): The x (pixels from the left edge) and y (pixels from the top edge) coordinates to start the drag from. Required only by `action=left_click_drag`.
     */
    start_coordinate?: [number, number];

    /**
     * Required only by `action=type`, `action=key`, and `action=hold_key`. Can also be used by click or scroll actions to hold down keys while clicking or scrolling.
     */
    text?: string;
  },
  {
    /**
     * The width of the display being controlled by the model in pixels.
     */
    displayWidthPx: number;

    /**
     * The height of the display being controlled by the model in pixels.
     */
    displayHeightPx: number;

    /**
     * The display number to control (only relevant for X11 environments). If specified, the tool will be provided a display number in the tool definition.
     */
    displayNumber?: number;
  }
>({
  id: 'anthropic.computer_20250124',
  inputSchema: computer_20250124InputSchema,
});
