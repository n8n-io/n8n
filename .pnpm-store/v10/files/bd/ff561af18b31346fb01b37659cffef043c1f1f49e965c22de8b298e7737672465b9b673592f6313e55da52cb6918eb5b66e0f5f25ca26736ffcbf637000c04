import {
  createProviderToolFactory,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

const computer_20241022InputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      action: z.enum([
        'key',
        'type',
        'mouse_move',
        'left_click',
        'left_click_drag',
        'right_click',
        'middle_click',
        'double_click',
        'screenshot',
        'cursor_position',
      ]),
      coordinate: z.array(z.number().int()).optional(),
      text: z.string().optional(),
    }),
  ),
);

export const computer_20241022 = createProviderToolFactory<
  {
    /**
     * The action to perform. The available actions are:
     * - `key`: Press a key or key-combination on the keyboard.
     *   - This supports xdotool's `key` syntax.
     *   - Examples: "a", "Return", "alt+Tab", "ctrl+s", "Up", "KP_0" (for the numpad 0 key).
     * - `type`: Type a string of text on the keyboard.
     * - `cursor_position`: Get the current (x, y) pixel coordinate of the cursor on the screen.
     * - `mouse_move`: Move the cursor to a specified (x, y) pixel coordinate on the screen.
     * - `left_click`: Click the left mouse button.
     * - `left_click_drag`: Click and drag the cursor to a specified (x, y) pixel coordinate on the screen.
     * - `right_click`: Click the right mouse button.
     * - `middle_click`: Click the middle mouse button.
     * - `double_click`: Double-click the left mouse button.
     * - `screenshot`: Take a screenshot of the screen.
     */
    action:
      | 'key'
      | 'type'
      | 'mouse_move'
      | 'left_click'
      | 'left_click_drag'
      | 'right_click'
      | 'middle_click'
      | 'double_click'
      | 'screenshot'
      | 'cursor_position';

    /**
     * (x, y): The x (pixels from the left edge) and y (pixels from the top edge) coordinates to move the mouse to. Required only by `action=mouse_move` and `action=left_click_drag`.
     */
    coordinate?: number[];

    /**
     * Required only by `action=type` and `action=key`.
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
  id: 'anthropic.computer_20241022',
  inputSchema: computer_20241022InputSchema,
});
