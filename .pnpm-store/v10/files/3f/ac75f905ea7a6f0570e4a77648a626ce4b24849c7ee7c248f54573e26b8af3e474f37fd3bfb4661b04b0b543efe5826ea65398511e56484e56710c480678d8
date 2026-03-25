;;; gyp-tests.el - unit tests for gyp-mode.

;; Copyright (c) 2012 Google Inc. All rights reserved.
;; Use of this source code is governed by a BSD-style license that can be
;; found in the LICENSE file.

;; The recommended way to run these tests is to run them from the command-line,
;; with the run-unit-tests.sh script.

(require 'cl)
(require 'ert)
(require 'gyp)

(defconst samples (directory-files "testdata" t ".gyp$")
  "List of golden samples to check")

(defun fontify (filename)
  (with-temp-buffer
    (insert-file-contents-literally filename)
    (gyp-mode)
    (font-lock-fontify-buffer)
    (buffer-string)))

(defun read-golden-sample (filename)
  (with-temp-buffer
    (insert-file-contents-literally (concat filename ".fontified"))
    (read (current-buffer))))

(defun equivalent-face (face)
  "For the purposes of face comparison, we're not interested in the
   differences between certain faces. For example, the difference between
   font-lock-comment-delimiter and font-lock-comment-face."
  (cl-case face
    ((font-lock-comment-delimiter-face) font-lock-comment-face)
    (t face)))

(defun text-face-properties (s)
  "Extract the text properties from s"
  (let ((result (list t)))
    (dotimes (i (length s))
      (setq result (cons (equivalent-face (get-text-property i 'face s))
                         result)))
    (nreverse result)))

(ert-deftest test-golden-samples ()
  "Check that fontification produces the same results as the golden samples"
  (dolist (sample samples)
    (let ((golden (read-golden-sample sample))
          (fontified (fontify sample)))
      (should (equal golden fontified))
      (should (equal (text-face-properties golden)
                     (text-face-properties fontified))))))

(defun create-golden-sample (filename)
  "Create a golden sample by fontifying filename and writing out the printable
   representation of the fontified buffer (with text properties) to the
   FILENAME.fontified"
  (with-temp-file (concat filename ".fontified")
    (print (fontify filename) (current-buffer))))

(defun create-golden-samples ()
  "Recreate the golden samples"
  (dolist (sample samples) (create-golden-sample sample)))
