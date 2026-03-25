<?php

/**
 * This file is part of the iconify.design libraries.
 *
 * (c) Vjacheslav Trushkin <cyberalien@gmail.com>
 *
 * @license MIT
 *
 * For the full copyright and license information, please view the license.txt
 * file that is available in this file's directory.
 */

namespace Iconify\IconsJSON;

class Finder
{
    /**
     * Get root directory of this package
     *
     * @return string
     */
    public static function rootDir()
    {
        return dirname(dirname(__FILE__));
    }

    /**
     * Return path to json file
     *
     * @param string $name Collection name
     * @return string Path to collection json file
     */
    public static function locate($name)
    {
        return dirname(dirname(__FILE__)) . '/json/' . $name . '.json';
    }

    /**
     * Get list of collections
     *
     * @return array|null
     */
    public static function collections()
    {
        $filename = dirname(dirname(__FILE__)) . '/collections.json';

        $data = @file_get_contents($filename);
        if (!is_string($data)) {
            return null;
        }
        $data = @json_decode($data, true);
        return is_array($data) ? $data : null;
    }
}
